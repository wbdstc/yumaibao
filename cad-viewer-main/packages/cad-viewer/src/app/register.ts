import { AcEdCommandStack } from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  AcApLayerStateCmd,
  AcApMissedDataCmd,
  AcApPointStyleCmd
} from '../command'
import { MlPointStyleDlg, MlReplacementDlg } from '../component'
import { useDialogManager } from '../composable'

export const registerCmds = () => {
  const stack = AcEdCommandStack.instance
  const cmdsToRemove: { group: string; localName: string }[] = []
  const iterator = stack.iterator()
  
  for (const cmd of iterator) {
    if (cmd.command.globalName && ['la', 'md', 'pttype'].includes(cmd.command.globalName.toLowerCase())) {
      cmdsToRemove.push({ group: cmd.commandGroup, localName: cmd.command.localName })
    }
  }

  cmdsToRemove.forEach(item => {
    stack.removeCmd(item.group, item.localName)
  })

  AcEdCommandStack.instance.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'la',
    'la',
    new AcApLayerStateCmd()
  )
  AcEdCommandStack.instance.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'md',
    'md',
    new AcApMissedDataCmd()
  )
  AcEdCommandStack.instance.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'pttype',
    'pttype',
    new AcApPointStyleCmd()
  )
}

export const registerDialogs = () => {
  const { registerDialog } = useDialogManager()
  registerDialog({
    name: 'ReplacementDlg',
    component: markRaw(MlReplacementDlg),
    props: {}
  })
  registerDialog({
    name: 'PointStyleDlg',
    component: markRaw(MlPointStyleDlg),
    props: {}
  })
}
